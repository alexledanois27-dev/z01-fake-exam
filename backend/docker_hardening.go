package backend

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

func requireRootlessDocker() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	out, err := exec.CommandContext(ctx, "docker", "info", "--format", "{{json .}}").Output()
	if err != nil {
		return fmt.Errorf("production : Docker rootless requis et inaccessible : %w", err)
	}
	var info struct {
		SecurityOptions []string
		CgroupVersion   string
		MemoryLimit     bool
		SwapLimit       bool
		CPUCfsQuota     bool
		PidsLimit       bool
	}
	if err := json.Unmarshal(out, &info); err != nil {
		return fmt.Errorf("configuration de sécurité Docker invalide")
	}
	rootless := false
	for _, option := range info.SecurityOptions {
		if option == "name=rootless" || option == "rootless" {
			rootless = true
		}
	}
	if !rootless {
		return fmt.Errorf("production : utiliser un daemon Docker rootless dédié au runner")
	}
	if info.CgroupVersion != "2" || !info.MemoryLimit || !info.SwapLimit || !info.CPUCfsQuota || !info.PidsLimit {
		return fmt.Errorf("production : Docker doit appliquer les limites mémoire, swap, CPU et processus avec cgroup v2")
	}
	return nil
}

// Keep the official images immutable and copy each read-only input into bounded tmpfs.
// No student process can write into a host bind mount or the image overlay.
func hardenDockerArgs(args []string) ([]string, error) {
	if len(args) == 0 || args[0] != "run" {
		return nil, fmt.Errorf("commande Docker invalide")
	}
	var options []string
	var mounts [][2]string
	entry, workdir := "", ""
	i := 1
	for ; i < len(args); i++ {
		flag := args[i]
		switch flag {
		case "--rm", "-i", "--interactive", "--read-only":
			options = append(options, flag)
		case "-v", "--volume", "--entrypoint", "-w", "--workdir", "--platform", "--network", "--pids-limit", "--ulimit", "--memory", "--memory-swap", "--security-opt", "--cap-drop", "--tmpfs", "--cpus", "-e", "--env", "--log-driver":
			if i+1 >= len(args) {
				return nil, fmt.Errorf("option Docker sans valeur")
			}
			value := args[i+1]
			i++
			switch flag {
			case "-v", "--volume":
				parts := strings.Split(value, ":")
				if len(parts) != 3 || parts[2] != "rw" || !filepath.IsAbs(parts[0]) || strings.ContainsAny(parts[0], ",\n\r") {
					return nil, fmt.Errorf("montage Docker invalide")
				}
				mounts = append(mounts, [2]string{parts[0], parts[1]})
			case "--entrypoint":
				entry = value
			case "-w", "--workdir":
				workdir = value
			default:
				options = append(options, flag, value)
			}
		default:
			if strings.HasPrefix(flag, "-") {
				return nil, fmt.Errorf("option Docker non autorisée : %s", flag)
			}
			goto imageFound
		}
	}
imageFound:
	if i >= len(args) {
		return nil, fmt.Errorf("image Docker absente")
	}
	image := args[i]
	allowed := false
	for _, pinned := range officialImages {
		if image == pinned {
			allowed = true
			break
		}
	}
	if !allowed {
		return nil, fmt.Errorf("image Docker non autorisée : seules les versions officielles épinglées sont exécutées")
	}
	command := args[i+1:]
	manual := entry != ""
	if !manual {
		workdir = "/tmp/runner"
		if strings.Contains(image, "/module-go@") || strings.Contains(image, "/test-go@") {
			entry = "/usr/local/bin/entrypoint.sh"
		} else {
			entry = "/app/entrypoint.sh"
		}
	}
	if workdir == "" {
		workdir = "/tmp/runner"
	}
	safe := append([]string{"run"}, options...)
	safe = append(safe, "--read-only", "--log-driver", "none", "--entrypoint", "/bin/sh", "-w", "/tmp",
		"-e", "HOME=/tmp/home", "-e", "GOCACHE=/tmp/home/.cache/go-build", "-e", "CARGO_HOME=/tmp/cargo", "-e", "CARGO_NET_OFFLINE=true")
	script := "set -eu\nmkdir -p /tmp/home /tmp/runner /tmp/cargo\n"
	if strings.Contains(image, "/module-go@") || strings.Contains(image, "/test-go@") {
		script += "if [ -d /root/.cache ]; then mkdir -p /tmp/home/.cache; cp -R /root/.cache/. /tmp/home/.cache/; fi\n"
	}
	if strings.Contains(image, "/module-rust@") && !manual {
		script += "for cache in registry git; do if [ -d /usr/local/cargo/$cache ]; then cp -R /usr/local/cargo/$cache /tmp/cargo/; fi; done\n"
	}
	for index, mount := range mounts {
		target := mount[1]
		switch target {
		case "/test-go/student", "/go-tests/student":
			target = "/tmp/runner/student"
		case "/root/piscine-go":
			target = "/tmp/home/piscine-go"
		case "/app/student/student":
			target = "/tmp/runner/student"
		case "/app/student":
			target = "/tmp/runner/student"
		case "/jail/student", "/workspace":
			safe = append(safe, "--tmpfs", target+":rw,exec,nosuid,nodev,size=128m,mode=0700")
		default:
			return nil, fmt.Errorf("destination de montage non autorisée")
		}
		// Destination strings above are fixed constants. Host paths stay separate argv values.
		source := fmt.Sprintf("/__input%d", index)
		safe = append(safe, "--mount", "type=bind,src="+mount[0]+",dst="+source+",readonly")
		script += "mkdir -p " + target + "\ncp -R " + source + "/. " + target + "/\n"
	}
	// Workdirs are supplied internally by the runners, never by the submitted code.
	if workdir != "/tmp/runner" && workdir != "/workspace" {
		return nil, fmt.Errorf("répertoire de travail non autorisé")
	}
	script += "cd " + workdir + "\nexec \"$@\""
	safe = append(safe, image, "-c", script, "runner", entry)
	safe = append(safe, command...)
	return safe, nil
}
