import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isAnimatedImage, isAudio, isImage, isVideo } from "./media.ts";

void test("isImage matches a path ending in an image extension", () => {
  assert.ok(isImage("https://example.com/cat.png"));
  assert.ok(isImage("https://example.com/cat.jpeg?width=640"));
  assert.ok(isImage("https://example.com/cat.webp#top"));
  assert.ok(isImage("//example.com/cat.svg"));
});

void test("isImage rejects an extension that does not end the path", () => {
  assert.ok(!isImage("https://example.com/cat.png/page"));
  assert.ok(!isImage("https://example.com/cat.pngx"));
  assert.ok(!isImage("https://cat.png.example.com/"));
  assert.ok(!isImage("https://example.com/cat"));
});

void test("isAnimatedImage only matches gif", () => {
  assert.ok(isAnimatedImage("https://example.com/dance.gif?x=1"));
  assert.ok(!isAnimatedImage("https://example.com/dance.png"));
  assert.ok(!isAnimatedImage("https://example.com/dance.gifv"));
});

void test("isVideo and isAudio match their extensions", () => {
  assert.ok(isVideo("https://example.com/clip.mp4"));
  assert.ok(isVideo("https://example.com/clip.webm?t=10"));
  assert.ok(!isVideo("https://example.com/clip.mp4.html"));
  assert.ok(isAudio("https://example.com/song.mp3"));
  assert.ok(isAudio("https://example.com/song.ogg#start"));
  assert.ok(!isAudio("https://example.com/song.mp3x"));
});
