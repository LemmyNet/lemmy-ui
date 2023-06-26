export default function siteBannerCss(banner: string): string {
  return ` \
      background-image: linear-gradient( rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8) ) ,url("${banner}"); \
      background-attachment: fixed; \
      background-position: top; \
      background-repeat: no-repeat; \
      background-size: 100% cover; \
  
      width: 100%; \
      max-height: 100vh; \
      `;
}
