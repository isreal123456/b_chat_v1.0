export default function PostImage({ src, alt }) {
  return (
    <div className="post-image">
      <img src={src} alt={alt} />
    </div>
  )
}
