import Link from "next/link";
import { choNeoRooms } from "@/lib/cho-neo/rooms";

export function ChoNeoBottomNav() {
  return (
    <nav className="village-bottom-nav" aria-label="Chợ Neo rooms">
      {choNeoRooms.map((room) => (
        <Link
          className={`bottom-nav-item bottom-nav-${room.status}`}
          href={room.href}
          key={room.id}
        >
          <span>{room.viName}</span>
          <small>
            {room.viStatus} / {room.enStatus}
          </small>
        </Link>
      ))}
    </nav>
  );
}
