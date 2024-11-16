#!/usr/bin/env node
/**********************************************************************
 * Copyright (C) 2025 Red Hat, Inc., Matthias Blümel
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import type { OctokitResponse } from '@octokit/types';
import type { OctokitOptions } from '@octokit/core/dist-types/types';
type ReposGetContentResponseData = RestEndpointMethodTypes['repos']['getContent']['response']['data'] & {
  encoding?: string;
  content?: string;
}; // these are not mentioned in the openapi-schema but in its example

const KUBERNETES_ORG = 'kubernetes';
const NGINX_INGRESS_REPO = 'ingress-nginx';
const NGINX_DEPLOY_FILE = 'deploy.yaml';
const NGINX_DEPLOY_PATH = 'deploy/static/provider/kind';
const NGINX_VERSION = 'v1.12.0';

const octokitOptions: OctokitOptions = {};
if (process.env.GITHUB_TOKEN) {
  octokitOptions.auth = process.env.GITHUB_TOKEN;
}
const octokit = new Octokit(octokitOptions);

// to make this file a module
export {};

async function downloadIngressNginx(
  tagVersion: string,
  repoPath: string,
  fileName: string,
  destFileName: string,
): Promise<void> {
  const destDir = path.resolve(__dirname, '..', 'src', 'resources');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir);
  }
  const destFile = path.resolve(destDir, destFileName);
  console.log(
    `Downloading Contour manifests from https://github.com/${KUBERNETES_ORG}/${NGINX_INGRESS_REPO}/${NGINX_DEPLOY_PATH}/${NGINX_DEPLOY_FILE} version ${tagVersion}`,
  );
  const manifests: OctokitResponse<ReposGetContentResponseData> = await octokit.rest.repos.getContent({
    owner: KUBERNETES_ORG,
    repo: NGINX_INGRESS_REPO,
    path: repoPath + '/' + fileName,
    ref: 'controller-' + tagVersion,
    headers: {
      accept: 'application/json',
    },
  });
  let buffer;

  if (manifests.data.encoding && manifests.data.encoding === 'base64') {
    buffer = Buffer.from(manifests.data.content, 'base64');
  } else {
    buffer = Buffer.from(manifests.data.content);
  }

  fs.writeFileSync(destFile, buffer);
  console.log(`Nginx.yaml available at ${destFile}`);
}

// grab the manifests from the given URL
// download the file from the given URL and store the content in destFile
// particular contour file should be manually added to the repo once downloaded
// run download script on demand using `pnpm --cwd extensions/kind/ run install:contour`
downloadIngressNginx(NGINX_VERSION, NGINX_DEPLOY_PATH, NGINX_DEPLOY_FILE, 'ingress-nginx.yaml');
