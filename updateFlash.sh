#!/bin/bash
./mkspiffs -c data -b 4096 -p 256 -s 0x160000  spiffs.bi
esptool.py  --chip esp32 write_flash -z 0x290000 spiffs.bin
