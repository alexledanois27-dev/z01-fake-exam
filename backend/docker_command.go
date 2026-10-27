package backend

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"sync/atomic"
	"time"
)

var containerSequence uint64

// Give every run a name so deadline cancellation removes the container itself,
// rather than only killing the local docker client.
func dockerRunCommand(ctx context.Context, args []string) *exec.Cmd {
	hardened, err := hardenDockerArgs(args)
	if err != nil {
		cmd := exec.CommandContext(ctx, "docker")
		cmd.Err = err
		return cmd
	}
	args = hardened
	name := fmt.Sprintf("personal-exam-%d-%d", os.Getpid(), atomic.AddUint64(&containerSequence, 1))
	named := append([]string{"run", "--name", name}, args[1:]...)
	cmd := exec.CommandContext(ctx, "docker", named...)
	cmd.Cancel = func() error {
		cleanup, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = exec.CommandContext(cleanup, "docker", "rm", "--force", name).Run()
		return cmd.Process.Kill()
	}
	cmd.WaitDelay = 3 * time.Second
	return cmd
}
