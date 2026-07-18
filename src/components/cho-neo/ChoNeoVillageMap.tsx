"use client";

import { useEffect } from "react";
import Link from "next/link";
import { choNeoRooms, openChoNeoRooms, soonChoNeoRooms } from "@/lib/cho-neo/rooms";
import { ChoNeoRoomHotspot } from "./ChoNeoRoomHotspot";
import { trackChoNeoBetaEvent } from "@/lib/cho-neo/beta-analytics";

const villageMapCanvases = {
  day: "/images/cho-neo/village-map-july-summer-day.png",
  twilight: "/images/cho-neo/village-map-master-twilight.png",
  night: "/images/cho-neo/village-map-summer-night.png",
} as const;

type VillageMapCanvasKey = keyof typeof villageMapCanvases;

const villageMapCanvasOrder: VillageMapCanvasKey[] = ["day", "twilight", "night"];

function getLocalVillageMapCanvas(date = new Date()): VillageMapCanvasKey {
  const hour = date.getHours();

  if (hour >= 17 && hour < 20) {
    return "twilight";
  }

  if (hour >= 20 || hour < 5) {
    return "night";
  }

  return "day";
}

function getAdjacentVillageMapCanvases(canvas: VillageMapCanvasKey) {
  const index = villageMapCanvasOrder.indexOf(canvas);
  const previous =
    villageMapCanvasOrder[(index - 1 + villageMapCanvasOrder.length) % villageMapCanvasOrder.length];
  const next = villageMapCanvasOrder[(index + 1) % villageMapCanvasOrder.length];

  return [previous, next];
}

export function ChoNeoVillageMap() {
  useEffect(() => {
    const activeCanvas = getLocalVillageMapCanvas();
    const canvasesToPreload = new Set([
      activeCanvas,
      ...getAdjacentVillageMapCanvases(activeCanvas),
    ]);

    canvasesToPreload.forEach((canvas) => {
      const image = new Image();
      image.decoding = "async";
      image.src = villageMapCanvases[canvas];
    });
  }, []);

  function renderMobileRoomLink(room: (typeof choNeoRooms)[number], index: number) {
    return (
      <Link
        className={`mobile-room-link mobile-room-link-${room.status}`}
        href={room.href}
        key={room.id}
        onClick={() =>
          trackChoNeoBetaEvent("room_entered", {
            room: room.id,
            details: {
              href: room.href,
              status: room.status,
              source: "mobile_drawer",
            },
          })
        }
      >
        <strong>
          <span>{index + 1}</span>
          {room.viName}
        </strong>
        <small>
          {room.enName}
          {room.status === "soon" ? <em>Sắp</em> : null}
        </small>
      </Link>
    );
  }

  return (
    <section className="village-scene" aria-label="Chợ Neo village destinations">
      <div className="scene-art" aria-hidden="true">
        {villageMapCanvasOrder.map((canvas) => (
          <span
            className={`scene-art-layer scene-art-layer-${canvas}`}
            key={canvas}
            style={{ backgroundImage: `url("${villageMapCanvases[canvas]}")` }}
          />
        ))}
      </div>
      <div className="scene-vignette" aria-hidden="true" />
      <div className="scene-ambient" aria-hidden="true">
        <span className="scene-lantern scene-lantern-cafe" />
        <span className="scene-lantern scene-lantern-shrine" />
        <span className="scene-lantern scene-lantern-market" />
        <span className="scene-lantern scene-lantern-waterfront" />
        <span className="scene-lantern scene-lantern-left-path" />
        <span className="scene-lantern scene-lantern-fountain-square" />
        <span className="scene-lantern scene-lantern-market-corner" />
        <span className="scene-reflection scene-reflection-fountain" />
        <span className="scene-haze scene-haze-left" />
        <span className="scene-haze scene-haze-right" />
      </div>

      {choNeoRooms.map((room) => (
        <ChoNeoRoomHotspot key={room.id} room={room} />
      ))}

      <div className="mobile-room-drawer">
        <div className="mobile-room-group mobile-room-group-open">
          <p>Đang mở</p>
          {openChoNeoRooms.map((room, index) => renderMobileRoomLink(room, index))}
        </div>

        <details className="mobile-room-group mobile-room-group-soon">
          <summary>
            <span>Sắp mở</span>
            <em>{soonChoNeoRooms.length} cửa</em>
          </summary>
          <div>
            {soonChoNeoRooms.map((room, index) =>
              renderMobileRoomLink(room, openChoNeoRooms.length + index),
            )}
          </div>
        </details>
      </div>
    </section>
  );
}
