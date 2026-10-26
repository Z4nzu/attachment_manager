import * as React from "react";
import { getExtension } from "../../lib/file_utils.js";

// Native HTML5 audio / video player.
export default function MediaView({ kind, fileUrl, fileName }) {
	if (kind === "audio") {
		return (
			<div className="m-auto w-full max-w-3xl p-4">
				<audio controls src={fileUrl} className="w-full">
					Your browser does not support the audio element.
				</audio>
			</div>
		);
	}
	const ext = getExtension(fileName) || "mp4";
	return (
		<div className="m-auto w-full max-w-3xl p-4">
			<video controls playsInline className="w-full rounded-lg">
				<source src={fileUrl} type={`video/${ext}`} />
				Your browser does not support the video tag.
			</video>
		</div>
	);
}
