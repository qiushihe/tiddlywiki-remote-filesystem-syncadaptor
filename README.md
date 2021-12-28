# TiddlyWiki Remote Filesystem Syncadaptor

A `syncadaptor` module for TiddlyWiki to synchronize tiddlers with remote filesystem (i.e. AWS S3).

## Bucket CORS Configuration

Apply the following CORS configuration to the bucket before using it:

```
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["HEAD", "GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```
