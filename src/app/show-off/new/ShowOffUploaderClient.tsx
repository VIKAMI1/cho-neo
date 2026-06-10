"use client";

import dynamic from "next/dynamic";

const ShowOffUploader = dynamic(() => import("./ShowOffUploader"), {
  ssr: false,
});

export default function ShowOffUploaderClient() {
  return <ShowOffUploader />;
}
