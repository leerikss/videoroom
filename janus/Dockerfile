FROM debian:bullseye

# Install dependencies
RUN apt-get update && apt-get install -y \
  libmicrohttpd-dev libjansson-dev libssl-dev libsrtp2-dev libsofia-sip-ua-dev \
  libglib2.0-dev libopus-dev libogg-dev libcurl4-openssl-dev liblua5.3-dev \
  libconfig-dev pkg-config gengetopt libtool automake git cmake libwebsockets-dev \
  libnice-dev zlib1g-dev \
  libavutil-dev libavcodec-dev libavformat-dev \
  && apt-get clean

# Build usrsctp
RUN git clone https://github.com/sctplab/usrsctp.git && \
    cd usrsctp && ./bootstrap && ./configure && make && make install && cd .. && rm -rf usrsctp && \
    echo "/usr/local/lib" > /etc/ld.so.conf.d/usrsctp.conf && ldconfig

# Clone Janus
WORKDIR /usr/src
RUN git clone https://github.com/meetecho/janus-gateway.git
WORKDIR janus-gateway

# Build Janus with only VideoRoom and WebSockets
RUN sh autogen.sh && ./configure \
  --prefix=/opt/janus \
  --enable-websockets \
  --enable-post-processing \
  --enable-libsrtp2 \
  --enable-data-channels \
  --disable-docs \
  --disable-plugin-sip \
  --disable-plugin-voicemail \
  --disable-plugin-textroom \
  --disable-plugin-audiobridge \
  --disable-plugin-recordplay \
  --disable-plugin-streaming && \
  make -j$(nproc) && make install && make configs

ENV PATH="/opt/janus/bin:$PATH"

CMD ["janus", "-F", "/opt/janus/etc/janus"]
