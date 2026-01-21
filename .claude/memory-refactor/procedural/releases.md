# Release Workflow

## GitHub Releases

Use `gh release` for creating releases with assets.

## Filename Conventions

**IMPORTANT:** Avoid brackets `[]` in artifact filenames.

Shell interpreters (bash/zsh) treat `[...]` as glob patterns, causing commands like:
```bash
gh release upload v1.0.0 my-mod-[1.21.1]-fabric.jar  # FAILS
```

**Solution:** Use hyphens instead:
```bash
gh release upload v1.0.0 my-mod-1.21.1-fabric.jar    # WORKS
```

This is configured in `gradle.properties`:
```properties
archives_base_name=cobblemon_quests_extended-1.21.1   # Good (no brackets)
```

## Changelog

- Maintain `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) format
- Update changelog before version bump
- Use changelog-generator agent for automated generation from commits
