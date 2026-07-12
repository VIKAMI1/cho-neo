"use client";

import Link from "next/link";
import { choNeoRooms, openChoNeoRooms, soonChoNeoRooms } from "@/lib/cho-neo/rooms";
import { ChoNeoRoomHotspot } from "./ChoNeoRoomHotspot";
import { trackChoNeoBetaEvent } from "@/lib/cho-neo/beta-analytics";

export function ChoNeoVillageMap() {
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
      <div className="scene-art" aria-hidden="true" />
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
