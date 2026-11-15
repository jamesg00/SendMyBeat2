export const MEDIA_ASPECT_RATIOS = {
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "1:1": 1,
  "4:5": 4 / 5,
};

export const getMediaAspectRatio = (aspectRatio = "16:9") => (
  MEDIA_ASPECT_RATIOS[aspectRatio] || MEDIA_ASPECT_RATIOS["16:9"]
);

// Same order as the renderer: stretch each axis (and flip), then rotate, then move. CSS applies
// these right to left, so rotate comes before scale in the string. Position is in half-frames.
export const getPreviewImageTransform = ({
  imagePosX = 0,
  imagePosY = 0,
  imageScaleX = 1,
  imageScaleY = 1,
  imageRotation = 0,
  imageFlipH = false,
  imageFlipV = false,
}) => (
  `translate(calc(-50% + ${imagePosX * 50}%), calc(-50% + ${imagePosY * 50}%)) ` +
  `rotate(${imageRotation}deg) ` +
  `scale(${imageScaleX * (imageFlipH ? -1 : 1)}, ${imageScaleY * (imageFlipV ? -1 : 1)})`
);
