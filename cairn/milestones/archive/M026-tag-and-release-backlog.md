# M026: Tag and release every 1.x version

**Status:** done (2026-10-20, PR #34 https://github.com/jmgirard/embedpdf/pull/34)

**Goal:** Every version from v1.0.0 to v1.2.9 has a tag on GitHub and a published GitHub release with notes.

**Outcome:** 13 annotated tags, v1.0.3 to v1.2.9, each on the first squash-merge commit on main whose
`_extension.yml` carries its version (v1.2.2 is 4bb3b55, whose subject names no version). 16 published
releases, v1.0.0 to v1.2.9, each with a short change list checked against its diff and a Full Changelog
compare link. v1.0.1 calls its removal of the `image*` options a breaking change. v1.2.9 is the latest
release, so the README badge shows it. The v0.x releases and the eight older tags did not change. The
DESIGN Known issues entry on the stale badge was deleted. `quarto add` installs from main, so the
releases change no install.

**Decisions:** none promoted. Publish at implement over drafts published after the merge. Tag at the
version's squash commit over the later "review M0NN: done" commit. Annotated tags, as v1.0.x.

**Review:** two passes, one return (AC5: the v1.0.1, v1.0.2, v1.0.3, and v1.2.8 notes left out a change
their commit subject names, so a line was added to each). No criterion was amended. Pass 2 four lenses,
19 findings: 10 fixed by editing release notes that overstated the code (v1.2.7 page opening in Safari,
v1.2.5 cross-site reads, v1.2.1 naming rule, "PDF output" for LaTeX output, and others). 1 follow-up held
by the row "Tag and release each version at merge". 8 rejected (post-merge hygiene, planned, or false).
Hygiene deleted the row "Publish GitHub releases for 1.0 tags".
