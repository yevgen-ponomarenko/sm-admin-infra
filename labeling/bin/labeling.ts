#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { SmAdminWebStack } from '../lib/sm-admin-web-stack';

const app = new cdk.App();
new SmAdminWebStack(app, 'SmAdminWebStack');
