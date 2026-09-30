# Releasing an update

How to get a change from a pull request into the Chrome Web Store.

## 1. Bump the version on the PR

The Chrome Web Store rejects an upload unless its version is higher than the published one. The version lives only in `extension/package.json`, and the build writes it into `manifest.json`.

On the PR branch:

```bash
npm version patch --workspace extension --no-git-tag-version   # 1.1.0 -> 1.1.1, bug fixes
npm version minor --workspace extension --no-git-tag-version   # 1.1.0 -> 1.2.0, new features
```

Add a section for the new version at the top of `CHANGELOG.md`, then commit and push.

## 2. Get the zip

CI builds the store package on every PR push:

1. On the PR, open the **Checks** tab and select the **CI** run.
2. On the run's summary page, download the **heb-grocery-agent-extension** artifact under **Artifacts**.
3. GitHub wraps artifacts in a zip, so unzip it once to get `heb-grocery-agent-v<version>.zip`. Upload that inner zip to the store; don't unzip it.

To build it locally instead, run `npm run package`. It writes `release/heb-grocery-agent-v<version>.zip`.

## 3. Test the exact build

1. Unzip `heb-grocery-agent-v<version>.zip` into a folder.
2. In `chrome://extensions`, turn on Developer mode, click **Load unpacked** and choose that folder. Turn off the store-installed copy while you test.
3. Sign in on heb.com and run a short list (three or four items). Check that the items land in the cart and that Cancel and Reset work.
4. If you use AI cleanup, run **Clean List** once with your provider.

## 4. Merge the PR

Merge once CI is green and the manual test passes.

## 5. Upload to the Chrome Web Store

1. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) and select **HEB Grocery Agent**.
2. Go to **Package** and click **Upload new package**. Choose `heb-grocery-agent-v<version>.zip`.
3. If the manifest's permissions changed, update the permission justifications on the **Privacy practices** tab. The current text is in `STORE_LISTING.md`.
4. If the description or screenshots changed, update the **Store listing** tab.
5. Click **Submit for review**. Review usually takes from a few hours to a few days. By default the update is published automatically once approved.

## 6. Tag the release

After the store accepts the update:

```bash
git checkout main && git pull
git tag v<version>
git push origin v<version>
```

Optionally, create a GitHub release from the tag, attach the zip, and paste in the changelog section.
