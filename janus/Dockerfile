FROM debian:bullseye

# Install dependencies
RUN apt-get update && apt-get install -y \
  libmicrohttpd-dev libjansson-dev libssl-dev libsrtp2-dev libsofia-sip-ua-dev \
  libglib2.0-dev libopus-dev libogg-dev libcurl4-openssl-dev liblua5.3-dev \
  libconfig-dev pkg-config gengetopt libtool automake git curl cmake libwebsockets-dev \
  libnice-dev zlib1g-dev \
  libavutil-dev libavcodec-dev libavformat-dev \
  && apt-get clean

# Download usrsctp
RUN mkdir -p /usr/src/usrsctp && \
  curl -L https://github.com/sctplab/usrsctp/archive/refs/tags/0.9.5.0.tar.gz | tar xz -C /usr/src/usrsctp --strip-components=1

# Build usrsctp
WORKDIR /usr/src/usrsctp
RUN ./bootstrap && ./configure && \
  make && make install && \
  echo "/usr/local/lib" > /etc/ld.so.conf.d/usrsctp.conf && ldconfig

# Download a tagger janus version
RUN mkdir -p /usr/src/janus-gateway && \
  curl -L https://github.com/meetecho/janus-gateway/archive/refs/tags/v1.3.1.tar.gz | tar xz -C /usr/src/janus-gateway --strip-components=1

# Build Janus with only VideoRoom, Streaming and WebSockets
WORKDIR /usr/src/janus-gateway
RUN sh autogen.sh && ./configure \
  --prefix=/opt/janus \
  --enable-websockets \
  --enable-plugin-streaming \
  --enable-post-processing \
  --enable-libsrtp2 \
  --enable-data-channels \
  --disable-docs \
  --disable-plugin-sip \
  --disable-plugin-voicemail \
  --disable-plugin-textroom \
  --disable-plugin-audiobridge \
  --disable-plugin-recordplay && \
  make -j$(nproc) && make install && make configs

ENV PATH="/opt/janus/bin:$PATH"

CMD ["janus", "-F", "/opt/janus/etc/janus"]
