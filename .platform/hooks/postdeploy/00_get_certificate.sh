#!/usr/bin/env bash
# Place in .platform/hooks/postdeploy directory
#TODO: Replace the domain name with your own
sudo certbot -n -d bakery.is404.net --nginx --agree-tos --email ryguy32@byu.edu