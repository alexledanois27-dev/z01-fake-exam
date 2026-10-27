package backend

import "bytes"

// Keep draining output so a verbose submission cannot exhaust server memory.
type limitedOutput struct {
	buffer    bytes.Buffer
	truncated bool
}

const maxRunnerOutput = 256 << 10

func (b *limitedOutput) Write(p []byte) (int, error) {
	n := len(p)
	remaining := maxRunnerOutput - b.Len()
	if len(p) > remaining {
		p = p[:remaining]
		b.truncated = true
	}
	_, _ = b.buffer.Write(p)
	return n, nil
}
func (b *limitedOutput) String() string {
	if b.truncated {
		return b.buffer.String() + "\n[Sortie tronquée à 256 Kio]"
	}
	return b.buffer.String()
}

func (b *limitedOutput) Len() int { return b.buffer.Len() }
