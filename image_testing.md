# Image Testing Playbook

See LLM_INTEGRATION_CHAT_WITH_IMAGE_ATTACHMENTS_PLAYBOOK response.

## Rules
- Use base64 JPEG/PNG/WEBP only
- No blank images, real features required
- Re-detect MIME after conversions
- GIFs: extract first frame
- Resize large images to reasonable bounds
