type PartnerBusinessImageGalleryProps = {
  imageUrls: string[];
};

export function PartnerBusinessImageGallery({ imageUrls }: PartnerBusinessImageGalleryProps) {
  if (imageUrls.length === 0) {
    return <p className="text-[12px] text-white/55">No business images uploaded.</p>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {imageUrls.map((url, index) => (
        <li key={`${url}-${index}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">
            Image {index + 1}
          </p>
          <div className="mt-2 space-y-2">
            <div
              className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-black/20"
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Business image ${index + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-[12px] font-medium text-[#ABE9FE] underline"
            >
              Open full size
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
