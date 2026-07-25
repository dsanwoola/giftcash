import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("album metadata and storage stay server-authoritative", () => {
  const firestore = read("firestore.rules");
  const storage = read("storage.rules");
  assert.match(firestore, /match \/event_albums\/\{eventId\} \{ allow read, write: if false; \}/);
  assert.match(firestore, /match \/event_album_photos\/\{photoId\} \{ allow read, write: if false; \}/);
  assert.match(firestore, /match \/album_photo_reports\/\{reportId\} \{ allow read, write: if false; \}/);
  assert.match(storage, /allow read, write: if false/);
  assert.doesNotMatch(storage, /allow write: if request\.auth/);
});

test("public album payload exposes approved photos only", () => {
  const server = read("src/lib/albums/server.ts");
  assert.match(server, /photo\.status === "approved"/);
  assert.match(server, /config\.enabled/);
  assert.doesNotMatch(server.slice(server.indexOf("publicAlbumPayload")), /uploaderId:/);
  assert.doesNotMatch(server.slice(server.indexOf("publicAlbumPayload")), /imagePath:/);
});

test("uploads verify identity, permissions, quotas, file size and decoded image safety", () => {
  const upload = read("src/app/api/events/[slug]/album/photos/route.ts");
  assert.ok(upload.indexOf("requireUid(req)") < upload.indexOf("req.formData()"));
  assert.match(upload, /guestUploadsEnabled/);
  assert.match(upload, /MAX_GUEST_PENDING_PHOTOS/);
  assert.match(upload, /MAX_ALBUM_PHOTOS/);
  assert.match(upload, /MAX_IMAGE_BYTES/);
  assert.match(upload, /ACCEPTED_IMAGE_TYPES/);
  assert.match(upload, /limitInputPixels: 40_000_000/);
  assert.match(upload, /\.rotate\(\)/);
  assert.match(upload, /\.webp\(\{ quality: 82 \}\)/);
  assert.match(upload, /status = isOrganizer \? "approved" : "pending"/);
  assert.match(upload, /firebaseStorageDownloadTokens/);
});

test("only organizers moderate, publish, reorder and select cover photos", () => {
  const route = read("src/app/api/events/[slug]/album/photos/[photoId]/route.ts");
  assert.match(route, /requireEventOrganizer\(event, uid\)/);
  assert.match(route, /photo\.eventId !== event\.id/);
  assert.match(route, /photo\.status === "pending"/);
  assert.match(route, /status: "approved"/);
  assert.match(route, /action === "cover"/);
  assert.match(route, /sortOrder/);
  assert.match(route, /deleteAlbumFiles/);
  assert.ok(route.indexOf(".update(updates)") < route.lastIndexOf("deleteAlbumFiles(photo)"));
});

test("public reports are deduplicated without storing raw visitor addresses", () => {
  const report = read("src/app/api/events/[slug]/album/photos/[photoId]/report/route.ts");
  assert.match(report, /createHash\("sha256"\)/);
  assert.match(report, /photo\.status !== "approved"/);
  assert.match(report, /album_photo_reports/);
  assert.doesNotMatch(report, /ipAddress:/);
  assert.doesNotMatch(report, /forwarded,/);
});

test("Moments Album keeps pre and post stages, moderation and gifting discoverable", () => {
  const component = read("src/components/album/moments-album.tsx");
  const eventPage = read("src/components/event/event-page.tsx");
  assert.match(component, /Before the event/);
  assert.match(component, /After the event/);
  assert.match(component, /Add a memory/);
  assert.match(component, /pendingApproval/);
  assert.match(component, /Approve/);
  assert.match(component, /Show album to gifters/);
  assert.match(component, /Community photo contributions/);
  assert.match(component, /Gift \{celebrants\}/);
  assert.match(component, /Report photo/);
  assert.match(eventPage, /<MomentsAlbum/);
  assert.ok(eventPage.indexOf("<MomentsAlbum") < eventPage.indexOf("{isOrganizer && ("));
});
