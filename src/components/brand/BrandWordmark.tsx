import { APP_DISPLAY_NAME, APP_ENGLISH_NAME } from '../../constants/brand'
import './brandWordmark.css'

/** English stays a natural word, centered beneath the Chinese brand name. */
export function BrandWordmark() {
  return <span className="brand-wordmark" aria-label={`${APP_DISPLAY_NAME} ${APP_ENGLISH_NAME}`}>
    <span className="brand-wordmark-cn" aria-hidden>{APP_DISPLAY_NAME}</span>
    <span className="brand-wordmark-en" aria-hidden>{APP_ENGLISH_NAME}</span>
  </span>
}
