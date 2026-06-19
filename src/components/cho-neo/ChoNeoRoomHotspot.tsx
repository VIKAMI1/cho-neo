"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";
import type { ChoNeoRoom } from "@/lib/cho-neo/rooms";

type ChoNeoRoomHotspotProps = {
  room: ChoNeoRoom;
};

export function ChoNeoRoomHotspot({ room }: ChoNeoRoomHotspotProps) {
  const [isSelected, setIsSelected] = useState(false);
  const style = {
    "--hotspot-x": room.hotspot.x,
    "--hotspot-y": room.hotspot.y,
    "--hotspot-w": room.hotspot.w,
    "--hotspot-h": room.hotspot.h,
  } as CSSProperties;

  return (
    <div
      className={`room-hotspot room-hotspot-${room.tone} room-hotspot-${room.status} ${
        isSelected ? "room-hotspot-selected" : ""
      }`}
      onMouseLeave={() => setIsSelected(false)}
      style={style}
    >
      <button
        aria-expanded={isSelected}
        aria-label={`${room.viName} / ${room.enName} - ${room.viStatus} / ${room.enStatus}`}
        className="room-hotspot-pin"
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) {
            setIsSelected(false);
          }
        }}
        onClick={() => setIsSelected((current) => !current)}
        onFocus={() => setIsSelected(true)}
        type="button"
      >
        <span aria-hidden="true">{room.icon}</span>
      </button>

      <div className="room-hotspot-label">
        <span className="room-hotspot-title">
          <span aria-hidden="true">{room.icon}</span>
          <span>
            <strong>{room.viName}</strong>
            <small>{room.enName}</small>
          </span>
        </span>
        <em>
          {room.viStatus} / {room.enStatus}
        </em>
        <Link
          href={room.href}
          onBlur={(event) => {
            if (!event.currentTarget.parentElement?.parentElement?.contains(event.relatedTarget)) {
              setIsSelected(false);
            }
          }}
        >
          {room.status === "open"
            ? "Vào phòng / Enter"
            : "Xem trước / Preview"}
        </Link>
      </div>
    </div>
  );
}
