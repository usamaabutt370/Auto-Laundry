export type PickedImage = {
  uri: string;
  mimeType: string;
};

export function pickImagesFromDocument(options: {
  multiple?: boolean;
}): Promise<PickedImage[]> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve([]);
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = options.multiple ?? false;

    let settled = false;
    const finish = (images: PickedImage[]) => {
      if (settled) return;
      settled = true;
      input.remove();
      window.removeEventListener("focus", onWindowFocus);
      resolve(images);
    };

    input.addEventListener("change", () => {
      const files = Array.from(input.files ?? []).slice(0, 10);
      finish(
        files.map((file) => ({
          uri: URL.createObjectURL(file),
          mimeType: file.type || "image/jpeg",
        })),
      );
    });

    const onWindowFocus = () => {
      window.setTimeout(() => {
        if (!input.files?.length) {
          finish([]);
        }
      }, 300);
    };

    window.addEventListener("focus", onWindowFocus);
    document.body.appendChild(input);
    input.click();
  });
}
