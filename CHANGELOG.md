# Changelog: Internet Archive provider

## 1.1

- Subtitles: SRT and WebVTT files in an item show up in the player, named by
  language. Episodes only get their own subtitles; Internet Archive's
  speech-recognition captions are labelled "Automatic captions"; empty files
  and SRT/VTT copies of the same captions are skipped.
- New setting to sort lists and search results: most popular (default),
  recently added or highest rated.
- Offline tests: `npm run test:unit`.

## 1.0

- Catalog rows, genres and search over Internet Archive's public domain and
  Creative Commons films and TV.
- Movies and series; every available format offered as a server.
- License setting: public domain and Creative Commons, or public domain only.
