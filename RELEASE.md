# How to release a new version of the Website Evidence Collector

1. Before releasing a new version on GitLab, make sure the `glab` CLI is installed.
2. Open the Repository in the terminal, make sure you are on the main branch and pull the latest changes.
3. Use `npm version` to increase the version to either a major, minor or patch.
4. Note the version returned by the tool.
5. Update the `CHANGLOG.md` using the new version.
6. Use `git push` or create a Merge Request (and wait till its merged) to bring the new version number to the main branch.
7. Run `git push --tags`.
8. Run `npm build`.
9. Enter build directory with `cd build/`.
10. Run `npm pack`.
11. Rename resulting artefact of form `website-evidence-collector-[version].tgz` to `website-evidence-collector.tgz`.
12. Run:
    ```bash
    glab release create [version] './website-evidence-collector.tgz#website-evidence-collector.tgz#package' --ref=main --name="[version] / YYYY-MM-DD"
    ```
13. Confirm the prompts using ENTER and choose "Leave Blank" for Release notes.
14. Check that the Release was created successfully.
15. Add Release notes in the web interface.
16. Change the `latest` tag using:
    ```bash
    git tag -f latest [new-version]
    git push --tags -f
    ```
