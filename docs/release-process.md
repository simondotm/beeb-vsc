# Extension Release Process

## 1. Versioning

First, ensure that new version numbers follow [semantic versioning](https://semver.org/).

* Major version zero (0.y.z) is for initial development. Anything may change at any time. The public API should not be considered stable.
* Version 1.0.0 defines the public API. The way in which the version number is incremented after this release is dependent on this public API and how it changes.
* Patch version Z (x.y.Z | x > 0) MUST be incremented if only backwards compatible bug fixes are introduced. A bug fix is defined as an internal change that fixes incorrect behavior.
* Minor version Y (x.Y.z | x > 0) MUST be incremented if new, backwards compatible functionality is introduced to the public API. It MAY include patch level changes. Patch version MUST be reset to 0 when minor version is incremented.
* Major version X (X.y.z | X > 0) MUST be incremented if any backwards incompatible changes are introduced to the public API. It MAY include minor and patch level changes. Patch and minor version MUST be reset to 0 when major version is incremented.

## 2. Bump Extension Version

Create and push a version bump commit to `master` branch.

Use commit message format `chore: Bump version to v1.2.3` (where `1.2.3` is the new version number).

In this commit, update the version number in the `package.json` file.

```json
{
	"version": "1.2.3"
}
```

Also update the `CHANGELOG.md` file with the new version number and summary of changes since the last release.

```markdown
...
### 1.2.3
- Simple summary of new features or fixes for this release
- Don't include PR's that are not user facing such as chores or docs etc.

### 1.2.2
...
```



## 3. Create a release

Once the CI has successfully passed the new commit, create a [new release on GitHub](https://github.com/simondotm/beeb-vsc/releases):

1. Click `Draft New Release` button
2. Make sure `master` branch is the target
3. Click `Choose a tag` button
4. Enter the new version number (e.g. `v1.2.3`- the `v` prefix is important)
5. Select `+Create new tag: v1.2.3 on publish` button
6. Enter the release title to be the same as the tag: eg. `v1.2.3`
7. `Previous tag` button should be `auto`
8. Click the `Generate release notes` button
9. Finally, click the `Publish release` button

CI will then automatically:
1. Check that the new release version tag matches the current version setting in `package.json`
2. Build and publish the new version to the Visual Studio Code Marketplace.
3. Apply the version tag to the master branch at the latest commit hash for the release.


