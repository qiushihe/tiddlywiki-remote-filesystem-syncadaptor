FROM alpine:3

RUN apk --update upgrade
RUN apk add bash
RUN apk add wget
RUN apk add unzip
RUN apk add dos2unix
RUN apk add nodejs
RUN apk add npm

RUN wget --quiet --output-document=/tiddlywiki.zip https://github.com/Jermolene/TiddlyWiki5/archive/refs/heads/master.zip
RUN unzip -qq /tiddlywiki.zip -d /
RUN mv /TiddlyWiki5-master /tiddlywiki
RUN rm /tiddlywiki.zip

RUN rm -fr /tiddlywiki-remote-filesystem-syncadaptor
RUN mkdir -p /tiddlywiki-remote-filesystem-syncadaptor
VOLUME /tiddlywiki-remote-filesystem-syncadaptor

RUN rm -fr /tiddlywiki/plugins/qiushihe
RUN mkdir -p /tiddlywiki/plugins/qiushihe
RUN ln -sf /tiddlywiki-remote-filesystem-syncadaptor /tiddlywiki/plugins/qiushihe/remote-filesystem

COPY ./rfs-build /tiddlywiki/editions/rfs-build
RUN dos2unix /tiddlywiki/editions/rfs-build

RUN rm -fr /tiddlywiki-html
RUN mkdir -p /tiddlywiki-html
VOLUME /tiddlywiki-html

COPY ./entry.sh /entry.sh
RUN dos2unix /entry.sh
RUN chmod +x /entry.sh
ENTRYPOINT ["/entry.sh"]
