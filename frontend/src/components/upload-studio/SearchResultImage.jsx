import React, { useEffect, useState } from "react";

const SearchResultImage = ({ result, alt, className = "" }) => {
  const thumbnailUrl = String(result?.thumbnail_url || "").trim();
  const imageUrl = String(result?.image_url || "").trim();
  const initialSrc = thumbnailUrl || imageUrl;
  const [src, setSrc] = useState(initialSrc);
  const [failed, setFailed] = useState(!initialSrc);

  useEffect(() => {
    const nextSrc = thumbnailUrl || imageUrl;
    setSrc(nextSrc);
    setFailed(!nextSrc);
  }, [thumbnailUrl, imageUrl]);

  const handleError = () => {
    if (src && imageUrl && src !== imageUrl) {
      setSrc(imageUrl);
      return;
    }
    setFailed(true);
  };

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-background text-center text-xs text-muted-foreground ${className}`}>
        Preview unavailable
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
};

export default SearchResultImage;
