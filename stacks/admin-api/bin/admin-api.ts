#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { AdminApiStack } from '../lib/admin-api-stack';

const app = new cdk.App();
new AdminApiStack(app, 'AdminApiStack');
