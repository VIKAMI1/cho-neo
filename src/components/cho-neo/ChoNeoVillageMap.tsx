import Link from "next/link";
import { choNeoRooms, openChoNeoRooms, soonChoNeoRooms } from "@/lib/cho-neo/rooms";
import { ChoNeoRoomHotspot } from "./ChoNeoRoomHotspot";

export function ChoNeoVillageMap() {
  return (
    <section className="village-scene" aria-label="Chợ Neo village destinations">
      <div className="scene-art" aria-hidden="true" />
      <div className="scene-vignette" aria-hidden="true" />

      {choNeoRooms.map((room) => (
        <ChoNeoRoomHotspot key={room.id} room={room} />
      ))}

      <div className="scene-panel scene-panel-open">
        <p>Đang mở</p>
        <strong>3 cửa đầu</strong>
        <span>3 open rooms</span>
      </div>

      <div className="mobile-room-drawer">
        <div>
          <p>Đang mở / Open</p>
          {openChoNeoRooms.map((room) => (
            <Link href={room.href} key={room.id}>
              {room.viName}
              <span>{room.enName}</span>
            </Link>
          ))}
        </div>
        <div>
          <p>Sắp mở / Coming soon</p>
          {soonChoNeoRooms.map((room) => (
            <Link href={room.href} key={room.id}>
              {room.viName}
              <span>{room.enName}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
