import { youtubeEmbedUrl } from "../../content/resources";

type YoutubeEmbedProps = {
  videoId: string;
  title: string;
};

/** 16:9 youtube-nocookie iframe used by resource posts. No autoplay or start time. */
export function YoutubeEmbed({ videoId, title }: YoutubeEmbedProps) {
  return (
    <div className="mt-6 w-full max-w-full overflow-hidden rounded-design border border-black bg-black/5">
      <div className="relative w-full max-w-full" style={{ paddingTop: "56.25%" }}>
        <iframe
          className="absolute inset-0 h-full w-full max-w-full"
          src={youtubeEmbedUrl(videoId)}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
}
