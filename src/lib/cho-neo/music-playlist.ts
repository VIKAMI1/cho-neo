export type ChoNeoMusicTrack = {
  id: string;
  title: string;
  src: string;
  mood: string;
  room: string;
  duration: string;
  enabled: boolean;
  order: number;
};

export type ChoNeoMusicState = {
  trackId: string;
  isPlaying: boolean;
  loadError: string;
};

export type ChoNeoMusicCommand =
  | { type: "select"; trackId: string; play?: boolean }
  | { type: "toggle" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "previous" }
  | { type: "next" }
  | { type: "volume"; volume: number };

export const CHO_NEO_MUSIC_SELECTED_TRACK_KEY = "choNeo.music.selectedTrack.v1";
export const CHO_NEO_MUSIC_VOLUME_KEY = "choNeo.music.volume.v1";
export const CHO_NEO_MUSIC_STATE_EVENT = "cho-neo:music-state";
export const CHO_NEO_MUSIC_COMMAND_EVENT = "cho-neo:music-command";

export const CHO_NEO_MUSIC_PLAYLIST = [
  {
    id: "main-theme-vietnamese-style-1",
    title: "Chợ Neo — Vietnamese Style 1",
    src: "/Cho_Neo_music/cho-neo-main-theme-vietnamese-style-1.mp3",
    mood: "Đậm chất Việt",
    room: "Toàn Chợ Neo",
    duration: "3:25",
    enabled: true,
    order: 1,
  },
  {
    id: "top-1-main-theme-3",
    title: "Chợ Neo Main Theme",
    src: "/Cho_Neo_music/cho-neo-theme-park-top-1-main-theme-3.mp3",
    mood: "Chủ đề chính",
    room: "Toàn Chợ Neo",
    duration: "2:28",
    enabled: true,
    order: 2,
  },
  {
    id: "runner-up-sky-lift",
    title: "Sky Lift",
    src: "/Cho_Neo_music/cho-neo-theme-park-runner-up-sky-lift.mp3",
    mood: "Nhẹ nhàng, bay bổng",
    room: "Toàn Chợ Neo",
    duration: "2:14",
    enabled: true,
    order: 3,
  },
  {
    id: "vietnamese-style-original",
    title: "Chợ Neo — Vietnamese Style, Bản Gốc",
    src: "/Cho_Neo_music/Cho Neo Music - Vietnamese Style.mp3",
    mood: "Đậm chất Việt",
    room: "Toàn Chợ Neo",
    duration: "2:56",
    enabled: true,
    order: 4,
  },
  {
    id: "vietnamese-style-2",
    title: "Chợ Neo — Vietnamese Style 2",
    src: "/Cho_Neo_music/Cho Neo Music - Vietnamese Style 2.mp3",
    mood: "Đậm chất Việt",
    room: "Toàn Chợ Neo",
    duration: "3:18",
    enabled: true,
    order: 5,
  },
  {
    id: "vietnamese-style-3",
    title: "Chợ Neo — Vietnamese Style 3",
    src: "/Cho_Neo_music/Cho Neo Music - Vietnamese Style 3.mp3",
    mood: "Đậm chất Việt",
    room: "Toàn Chợ Neo",
    duration: "3:03",
    enabled: true,
    order: 6,
  },
  {
    id: "lounge-1",
    title: "Chợ Neo Lounge — Bản 1",
    src: "/Cho_Neo_music/Cho Neo Music - lounge.mp3",
    mood: "Thư giãn",
    room: "Toàn Chợ Neo",
    duration: "3:02",
    enabled: true,
    order: 7,
  },
  {
    id: "lounge-2",
    title: "Chợ Neo Lounge — Bản 2",
    src: "/Cho_Neo_music/Cho Neo Music - lounge (1).mp3",
    mood: "Thư giãn",
    room: "Toàn Chợ Neo",
    duration: "2:33",
    enabled: true,
    order: 8,
  },
  {
    id: "ban-chuyen-nghe-1",
    title: "Bàn Chuyện Nghề — Bản 1",
    src: "/Cho_Neo_music/Ban Chuyen Nghe.mp3",
    mood: "Tâm tình nghề nghiệp",
    room: "Bàn Chuyện Nghề",
    duration: "3:09",
    enabled: true,
    order: 9,
  },
  {
    id: "ban-chuyen-nghe-2",
    title: "Bàn Chuyện Nghề — Bản 2",
    src: "/Cho_Neo_music/Ban Chuyen Nghe 1.mp3",
    mood: "Tâm tình nghề nghiệp",
    room: "Bàn Chuyện Nghề",
    duration: "3:12",
    enabled: true,
    order: 10,
  },
  {
    id: "ban-chuyen-nghe-3",
    title: "Bàn Chuyện Nghề — Bản 3",
    src: "/Cho_Neo_music/Ban Chuyen Nghe (2).mp3",
    mood: "Tâm tình nghề nghiệp",
    room: "Bàn Chuyện Nghề",
    duration: "2:51",
    enabled: true,
    order: 11,
  },
  {
    id: "ban-chuyen-nghe-4",
    title: "Bàn Chuyện Nghề — Bản 4",
    src: "/Cho_Neo_music/Ban Chuyen Nghe (3).mp3",
    mood: "Tâm tình nghề nghiệp",
    room: "Bàn Chuyện Nghề",
    duration: "2:58",
    enabled: true,
    order: 12,
  },
  {
    id: "ban-chuyen-nghe-tay-nghe-tay-thuong",
    title: "Bàn Chuyện Nghề — Tay Nghề, Tay Thương",
    src: "/Cho_Neo_music/Bàn Chuyện Nghề - Tay Nghề Tay Thương.mp3",
    mood: "Ấm áp, yêu nghề",
    room: "Bàn Chuyện Nghề",
    duration: "2:26",
    enabled: true,
    order: 13,
  },
  {
    id: "quan-tam-ke-nghe-coi",
    title: "Quán Tám — Kể Nghe Coi",
    src: "/Cho_Neo_music/Quán Tám - Kể Nghe Coi.mp3",
    mood: "Rôm rả, gần gũi",
    room: "Quán Tám",
    duration: "2:59",
    enabled: true,
    order: 14,
  },
  {
    id: "quan-tam-ke-nghe-coi-solo-1",
    title: "Quán Tám — Kể Nghe Coi, Solo 1",
    src: "/Cho_Neo_music/Quán Tám - Kể Nghe Coi - solo.mp3",
    mood: "Mộc mạc, nhẹ nhàng",
    room: "Quán Tám",
    duration: "3:48",
    enabled: true,
    order: 15,
  },
  {
    id: "quan-tam-ke-nghe-coi-solo-2",
    title: "Quán Tám — Kể Nghe Coi, Solo 2",
    src: "/Cho_Neo_music/Quán Tám - Kể Nghe Coi - solo (1).mp3",
    mood: "Mộc mạc, nhẹ nhàng",
    room: "Quán Tám",
    duration: "0:43",
    enabled: true,
    order: 16,
  },
  {
    id: "ong-dia-dat-am-loc-ve",
    title: "Ông Địa — Đất Ấm, Lộc Về",
    src: "/Cho_Neo_music/Ông Địa — Đất Ấm Lộc Về _ Warm Earth, Blessings Return 2.mp3",
    mood: "Ấm áp, an lành",
    room: "Ông Địa",
    duration: "3:40",
    enabled: true,
    order: 17,
  },
] as const satisfies readonly ChoNeoMusicTrack[];

export const enabledChoNeoMusicTracks = CHO_NEO_MUSIC_PLAYLIST
  .filter((track) => track.enabled)
  .sort((a, b) => a.order - b.order);

export function getChoNeoMusicTrack(trackId: string) {
  return (
    enabledChoNeoMusicTracks.find((track) => track.id === trackId) ??
    enabledChoNeoMusicTracks[0]
  );
}

export function getAdjacentChoNeoMusicTrack(
  trackId: string,
  direction: "previous" | "next",
) {
  const currentIndex = enabledChoNeoMusicTracks.findIndex(
    (track) => track.id === trackId,
  );
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const offset = direction === "previous" ? -1 : 1;
  const nextIndex =
    (safeIndex + offset + enabledChoNeoMusicTracks.length) %
    enabledChoNeoMusicTracks.length;

  return enabledChoNeoMusicTracks[nextIndex];
}
