package main

import (
	backend "Z02INTRA"
	"flag"
	"log"
)

func main() {
	output := flag.String("output", "catalog-snapshots", "Répertoire des snapshots publics à écrire")
	flag.Parse()
	if err := backend.ExportCatalogSnapshots(*output); err != nil {
		log.Fatal(err)
	}
	log.Printf("Snapshots des quatre langages synchronisés dans %s", *output)
}
