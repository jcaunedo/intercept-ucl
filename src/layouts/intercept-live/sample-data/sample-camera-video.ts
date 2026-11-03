// The bedside camera clip the alert modal's video consult shows: the first .mp4 in `videos/`. `sample-bedside-camera.mp4`
// is AI-generated (Midjourney, Nov 2, 2026), fictional people, never a real patient (Brief: synthetic data only): a
// nurse at the bedside talking to the camera, played forward then backward so it loops without a jump. With no clip
// there, the consult draws the room. An app streams the room's camera instead.
const clips = import.meta.glob<string>("./videos/*.mp4", { eager: true, query: "?url", import: "default" });

const sampleCameraVideo: string | undefined = Object.values(clips)[0];

export { sampleCameraVideo };
