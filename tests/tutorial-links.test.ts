import assert from "node:assert/strict";
import { portalTutorials } from "../lib/tutorials";

assert.equal(portalTutorials.length, 2);
assert.equal(new Set(portalTutorials.map((tutorial) => tutorial.id)).size, 2);
assert.equal(new Set(portalTutorials.map((tutorial) => tutorial.videoUrl)).size, 2);
for (const tutorial of portalTutorials) {
  const url = new URL(tutorial.videoUrl);
  assert.equal(url.protocol, "https:");
  assert.equal(url.hostname, "wienercarrion-my.sharepoint.com");
  assert.ok(url.pathname.includes("/personal/juan_quinonez_uwiener_edu_pe/"));
  assert.ok(!tutorial.videoUrl.toLowerCase().includes("localhost"));
  assert.equal(tutorial.active, true);
}
console.log(JSON.stringify({ tutorials: 2, uniqueLinks: true, oneDriveInstitutional: true, noLocalhost: true }));
