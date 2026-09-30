# Releasing an update

Once the one-time setup below is done, a release is: bump the version in a PR and merge it. GitHub Actions uploads the new version to the Chrome Web Store and submits it for review. Merges that don't change the version publish nothing.

## Every release

### 1. Bump the version on the PR

The Chrome Web Store rejects an upload unless its version is higher than the published one. The version lives only in `extension/package.json`, and the build writes it into `manifest.json`.

On the PR branch:

```bash
npm version patch --workspace extension --no-git-tag-version   # 1.1.0 -> 1.1.1, bug fixes
npm version minor --workspace extension --no-git-tag-version   # 1.1.0 -> 1.2.0, new features
```

Add a section for the new version at the top of `CHANGELOG.md`, then commit and push.

### 2. Test the exact build

CI builds the extension on every PR push:

1. On the PR, open the **Checks** tab, select the **CI** run, and download the **heb-grocery-agent-v&lt;version&gt;** artifact from the bottom of its summary page.
2. Unzip it into a folder. Safari may do this for you.
3. In `chrome://extensions`, turn on Developer mode, click **Load unpacked** and choose that folder. Turn off the store-installed copy while you test.
4. Sign in on heb.com and run a short list (three or four items). Check that the items land in the cart and that Cancel and Reset work. If you use AI cleanup, run **Clean List** once.

### 3. Merge the PR

When a merge to `main` has a version with no `v<version>` tag yet, the **Release** workflow:

1. Runs the checks.
2. Uploads the zip to the Chrome Web Store and submits it for review.
3. Creates the `v<version>` tag and a GitHub release with the zip attached.

Watch it under the repo's **Actions** tab. Review usually takes a few hours to a few days, and the update goes live automatically once approved.

If a publish fails (for example, a missing secret), fix the cause, then open **Actions → Release → Run workflow** on `main` to retry. The tag is created only after the store accepts the upload, so retrying is safe.

**If the manifest's permissions changed**, update the justifications on the dashboard's **Privacy practices** tab (text in `STORE_LISTING.md`) before merging. Otherwise review may be rejected.

## One-time setup for automatic publishing

The workflow needs five repository secrets. Add them under **Settings → Secrets and variables → Actions → New repository secret**.

| Secret                  | Where to find it                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `CHROME_EXTENSION_ID`   | The 32-letter ID in the extension's Developer Dashboard URL, or on its store page URL.                                            |
| `CHROME_PUBLISHER_ID`   | Your developer account ID (not the extension ID). It is in the dashboard URL when logged in: `.../devconsole/<publisher-id>/...`. |
| `CHROME_CLIENT_ID`      | From the Google Cloud OAuth client created below.                                                                                 |
| `CHROME_CLIENT_SECRET`  | From the same OAuth client.                                                                                                       |
| `CHROME_REFRESH_TOKEN`  | Generated once with your Google account, below.                                                                                   |

To get the OAuth values, follow the step-by-step guide at https://github.com/fregante/chrome-webstore-upload-keys. In short:

1. In the [Google Cloud console](https://console.cloud.google.com/), create a project and enable the **Chrome Web Store API**.
2. Configure the OAuth consent screen as **External**, add yourself as a test user, then **publish the app**. A consent screen left in "Testing" issues refresh tokens that expire after 7 days.
3. Create an OAuth client ID. The guide says which application type to pick. Copy the client ID and secret.
4. Generate the refresh token with the guide's helper, signing in with the Google account that owns the store listing.

## Publishing by hand

If the workflow is not set up, or you need to publish without it:

1. Download the CI artifact from the merge commit's run on `main`, or run `npm run package` locally to get `release/heb-grocery-agent-v<version>.zip`.
2. Upload a zip with `manifest.json` at its root. Upload the CI artifact as downloaded, without unzipping it. If your browser unzipped it into a folder, zip the files inside the folder rather than the folder itself (on a Mac: open the folder, select all, right-click, Compress).
3. In the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), open **HEB Grocery Agent** → **Package** → **Upload new package**, then **Submit for review**.
