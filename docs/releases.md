# Releases

The API and bundled React app share one repository release stream. Release Please
uses conventional commits on `main` to maintain a release pull request. Merging
that PR causes the next Release Please run to create its `vX.Y.Z` tag and GitHub
release. The workflow also supports a manual run on `main`.

## One-time setup

1. Create a fine-grained personal access token for a trusted release account with
   access to this repository. Grant **Contents**, **Issues**, and **Pull requests**
   read and write permissions. Metadata read access is implicit. The account must
   be allowed to push release branches and open PRs. Set an expiration and rotate
   the token before it expires.
2. Save it as the repository Actions secret `RELEASE_PLEASE_TOKEN` under
   **Settings > Secrets and variables > Actions**. Do not put the token in Git.
3. Merge this integration into `main`. The workflow fails with a setup message if
   the secret is missing. After setup, it can be retried from the Actions page.
4. Review the generated release PR and wait for the existing CI checks to pass.
   Merge it when ready to publish the GitHub release.

A dedicated token lets bot-created PRs trigger the existing CI workflows. The
built-in `GITHUB_TOKEN` suppresses those follow-up workflow runs, and this
repository currently disables Actions-created PRs. The workflow therefore does
not fall back to that token. See the [upstream credential guidance](https://github.com/googleapis/release-please-action#other-actions-on-release-please-prs).

The build job retains the required check name `build-and-test (10.0.x)` while
actually running the patched SDK selected in its matrix. No branch protection
settings need to change for this integration.

## Commit and PR titles

Use conventional commit titles, particularly when squash-merging:

- `fix: correct interest rounding` proposes a patch release.
- `feat: add a calculator` proposes a minor release.
- `feat!: change a response contract` proposes a major release.
- `docs:`, `chore:`, and `ci:` changes do not normally trigger a release alone.

Non-conventional titles can be omitted from generated release notes. Review the
notes before merging a release PR, especially for the first automated release.

## Version tracking

`release-please-config.json` configures the root `simple` release strategy.
`.release-please-manifest.json` and `version.txt` start at the existing `v1.0.0`
release. The bootstrap SHA is the commit behind that tag, so the first automated
release considers changes since that release rather than discarding them. After
the first automated release, Release Please follows its own release history.

Release PRs update `version.txt`, `CHANGELOG.md`, and the manifest. This version is
repository release metadata; frontend package versions, .NET assembly versions,
and the API route version are not managed by this integration.

The workflow creates GitHub releases only. It does not publish npm or NuGet
packages. Render continues deploying pushes to `main` through the existing
configuration, including a merged release PR.

To request a particular next version, use a conventional commit with a
`Release-As: X.Y.Z` footer, as described in the [Release Please documentation](https://github.com/googleapis/release-please#how-do-i-change-the-version-number).
