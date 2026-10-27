package backend

import "strings"

// baseDockerRunArgs is shared by the official Go and JS runners.
func baseDockerRunArgs(_ string) []string {
	return []string{
		"--network", "none",
		"--pids-limit", getenvDefault("RUNNER_PIDS_LIMIT", "128"),
		"--memory", getenvDefault("RUNNER_MEMORY", "512m"),
		"--memory-swap", getenvDefault("RUNNER_MEMORY", "512m"),
		"--security-opt", "no-new-privileges",
		"--cap-drop", "ALL",
		"--ulimit", "nofile=1024:1024",
		"--ulimit", "core=0:0",
		"--tmpfs", "/tmp:rw,exec,nosuid,nodev,size=256m",
	}
}

func withOptionalCPULimit(args []string) []string {
	if cpus := strings.TrimSpace(getenvDefault("RUNNER_CPUS", "1")); cpus != "" && cpus != "0" {
		return append(args, "--cpus", cpus)
	}
	return args
}
