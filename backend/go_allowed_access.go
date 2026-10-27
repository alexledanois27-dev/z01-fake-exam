package backend

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"path"
	"strconv"
	"strings"
)

// The image's RC currently accepts some unlisted members of an allowed package.
// Validate exact imported-package accesses as a complement, not a replacement
// for its builtin/loop/formatting checks and functional tests.
func checkGoAllowedAccess(file, source string, rules []string) error {
	if rules == nil {
		return nil
	}
	permissions := make(map[string]map[string]bool)
	for _, rule := range rules {
		if strings.HasPrefix(rule, "-") {
			continue
		}
		rule = strings.SplitN(rule, "#", 2)[0]
		dot := strings.LastIndex(rule, ".")
		if dot < 0 {
			continue
		}
		pkg, member := rule[:dot], rule[dot+1:]
		if permissions[pkg] == nil {
			permissions[pkg] = make(map[string]bool)
		}
		permissions[pkg][member] = true
	}
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, file, source, 0)
	if err != nil {
		return fmt.Errorf("Code Go invalide : %w", err)
	}
	imports := make(map[string]string)
	for _, spec := range node.Imports {
		pkg, err := strconv.Unquote(spec.Path.Value)
		if err != nil {
			return err
		}
		if permissions[pkg] == nil {
			return fmt.Errorf("illegal-import : %s (%s). Package absent des fonctions autorisées.", pkg, fset.Position(spec.Pos()))
		}
		name := path.Base(pkg)
		if spec.Name != nil {
			name = spec.Name.Name
		}
		if name == "." {
			return fmt.Errorf("Import pointé non pris en charge : utilise un nom de package ou un alias explicite (%s).", fset.Position(spec.Pos()))
		}
		if name != "_" {
			imports[name] = pkg
		}
	}
	var accessError error
	ast.Inspect(node, func(n ast.Node) bool {
		if accessError != nil {
			return false
		}
		selector, ok := n.(*ast.SelectorExpr)
		if !ok {
			return true
		}
		ident, ok := selector.X.(*ast.Ident)
		// Parser object resolution distinguishes imported names from local variables
		// with the same name (e.g. a struct named math in an inner scope).
		if !ok || ident.Obj != nil {
			return true
		}
		pkg, ok := imports[ident.Name]
		if !ok {
			return true
		}
		allowed := permissions[pkg]
		if !allowed["*"] && !allowed[selector.Sel.Name] {
			accessError = fmt.Errorf("illegal-access : %s.%s (%s). Fonction ou symbole absent des fonctions autorisées.", pkg, selector.Sel.Name, fset.Position(selector.Pos()))
			return false
		}
		return true
	})
	return accessError
}
