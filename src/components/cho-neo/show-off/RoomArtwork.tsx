import Image from "next/image";
import type { RoomArtworkConfig } from "./types";

type RoomArtworkProps = {
  artwork: RoomArtworkConfig;
};

export function RoomArtwork({ artwork }: RoomArtworkProps) {
  return (
    <figure className="show-off-room-artwork" style={{ aspectRatio: artwork.aspectRatio }}>
      <Image
        src={artwork.src}
        alt={artwork.alt}
        fill
        priority
        sizes="(max-width: 900px) 100vw, 880px"
        className="show-off-room-artwork-image"
        style={{ objectPosition: artwork.objectPosition }}
      />
      {(artwork.caption || artwork.attribution) && (
        <figcaption>
          {artwork.caption ? <span>{artwork.caption}</span> : null}
          {artwork.attribution ? <small>{artwork.attribution}</small> : null}
        </figcaption>
      )}
    </figure>
  );
}
