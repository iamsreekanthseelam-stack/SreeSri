// src/googleDriveService.ts

const CLIENT_ID = "993142680699-qnm9j6ru6olsvsqo64ckbmos8rfhrssn.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

let tokenClient: any;

export function initGoogleAuth(): Promise<void> {
  return new Promise((resolve, reject) => {
    const checkGoogle = () => {
      if (window.gapi && window.google) {
        window.gapi.load("client", async () => {
          await window.gapi.client.init({
            discoveryDocs: [
              "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
            ],
          });

          resolve();
        });
      } else {
        setTimeout(checkGoogle, 200);
      }
    };

    checkGoogle();
  });
}

export function login() {
  return new Promise<void>((resolve, reject) => {
    tokenClient.callback = (resp: any) => {
      if (resp.error) reject(resp);
      else resolve();
    };

    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

export async function readJsonFile(fileId: string) {
  const response = await window.gapi.client.drive.files.get({
    fileId: fileId,
    alt: "media",
  });

  return JSON.parse(response.body);
}

export async function updateJsonFile(fileId: string, data: any) {
  const boundary = "foo_bar_baz";

  const multipartRequestBody =
    `--${boundary}\r\n` +
    "Content-Type: application/json\r\n\r\n" +
    JSON.stringify({ mimeType: "application/json" }) +
    `\r\n--${boundary}\r\n` +
    "Content-Type: application/json\r\n\r\n" +
    JSON.stringify(data) +
    `\r\n--${boundary}--`;

  await window.gapi.client.request({
    path: `/upload/drive/v3/files/${fileId}`,
    method: "PATCH",
    params: { uploadType: "multipart" },
    headers: {
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });
}
