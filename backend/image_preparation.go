package backend

import (
	"context"
	"fmt"
	"log"
	"os/exec"
	"strings"
	"sync"
	"time"
)

const imagePreparationTimeout = 10 * time.Minute

type imagePreparation struct {
	running  bool
	failedAt time.Time
	err      error
}

type imagePreparer struct {
	mu      sync.Mutex
	jobs    map[string]*imagePreparation
	slots   chan struct{}
	inspect func(context.Context, string) error
	pull    func(context.Context, string) error
}

func newImagePreparer() *imagePreparer {
	return &imagePreparer{
		jobs: make(map[string]*imagePreparation), slots: make(chan struct{}, 2),
		inspect: func(ctx context.Context, image string) error {
			out, err := exec.CommandContext(ctx, "docker", "image", "inspect", "--format", "{{.Os}}/{{.Architecture}}", image).Output()
			if err != nil {
				return err
			}
			if strings.TrimSpace(string(out)) != "linux/amd64" {
				return fmt.Errorf("image linux/amd64 absente")
			}
			return nil
		},
		pull: func(ctx context.Context, image string) error {
			// No student code, credentials or arbitrary image names enter this command.
			cmd := exec.CommandContext(ctx, "docker", "pull", "--platform", "linux/amd64", image)
			var output limitedOutput
			cmd.Stdout, cmd.Stderr = &output, &output
			err := cmd.Run()
			if err != nil {
				log.Printf("Préparation de %s : %v\n%s", image, err, output.String())
			}
			return err
		},
	}
}

var runnerImages = newImagePreparer()

// ready returns immediately while a bounded, deduplicated background job pulls.
// Jobs are independent of HTTP disconnects and never retain submitted code.
func (p *imagePreparer) ready(image string) (bool, error) {
	allowed := false
	for _, pinned := range officialImages {
		if image == pinned {
			allowed = true
			break
		}
	}
	if !allowed {
		return false, fmt.Errorf("image de correction non autorisée")
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	if job := p.jobs[image]; job != nil {
		if job.running {
			return false, nil
		}
		if job.err != nil && time.Since(job.failedAt) < 30*time.Second {
			return false, fmt.Errorf("préparation de la moulinette impossible : vérifier Docker, la connexion Internet et l’espace disque ; réessayer dans 30 secondes")
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	err := p.inspect(ctx, image)
	cancel()
	if err == nil {
		delete(p.jobs, image)
		return true, nil
	}
	job := &imagePreparation{running: true}
	p.jobs[image] = job
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), imagePreparationTimeout)
		defer cancel()
		var err error
		select {
		case p.slots <- struct{}{}:
			err = p.pull(ctx, image)
			<-p.slots
		case <-ctx.Done():
			err = ctx.Err()
		}
		// A successful CLI exit must correspond to an installed amd64 image.
		if err == nil {
			err = p.inspect(ctx, image)
		}
		p.mu.Lock()
		job.running = false
		job.err = err
		if err != nil {
			job.failedAt = time.Now()
		}
		p.mu.Unlock()
	}()
	return false, nil
}

func exerciseImage(track string, ex Exercise) string {
	switch track {
	case "go":
		return goImageFor(ex)
	case "js":
		return jsRunnerImage()
	case "rust":
		return officialRustCheckpointImage
	case "java":
		return officialJavaModuleImage
	default:
		return ""
	}
}
