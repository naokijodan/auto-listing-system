import express, { Router } from 'express';
import request from 'supertest';
import { describe, test, expect } from 'vitest';
import { createEbayRouter, EbayRouteConfig } from './ebay-route-factory';

function countRoutes(router: Router): number {
  const stack: unknown = (router as unknown as { stack?: unknown }).stack;
  if (!Array.isArray(stack)) return 0;
  return stack.filter((layer: unknown) => Boolean((layer as { route?: unknown }).route)).length;
}

function buildApp(config: EbayRouteConfig) {
  const app = express();
  app.use(createEbayRouter(config));
  return app;
}

type Method = 'get' | 'post' | 'put' | 'delete';

function expectedEndpoints(resourceName: string, action = 'start', detail = 'download') {
  const id = '123';
  const tid = 't1';
  const sid = 's1';
  const endpoints: Array<{ method: Method; path: string; section: string; id?: string }> = [
    // Dashboard (5)
    { method: 'get', path: '/dashboard', section: 'dashboard' },
    { method: 'get', path: '/dashboard/summary', section: 'dashboard-summary' },
    { method: 'get', path: '/dashboard/jobs', section: 'dashboard-jobs' },
    { method: 'get', path: '/dashboard/history', section: 'dashboard-history' },
    { method: 'get', path: '/dashboard/stats', section: 'dashboard-stats' },

    // Main CRUD (6)
    { method: 'get', path: `/${resourceName}`, section: `${resourceName}-list` },
    { method: 'post', path: `/${resourceName}`, section: `${resourceName}-create` },
    { method: 'put', path: `/${resourceName}/${id}`, section: `${resourceName}-update`, id },
    { method: 'delete', path: `/${resourceName}/${id}`, section: `${resourceName}-delete`, id },
    { method: 'post', path: `/${resourceName}/${id}/${action}`, section: `${resourceName}-${action}`, id },
    { method: 'get', path: `/${resourceName}/${id}/${detail}`, section: `${resourceName}-${detail}`, id },

    // Templates (4)
    { method: 'get', path: '/templates', section: 'templates-list' },
    { method: 'get', path: `/templates/${tid}`, section: 'templates-detail', id: tid },
    { method: 'post', path: '/templates/create', section: 'templates-create' },
    { method: 'post', path: '/templates/preview', section: 'templates-preview' },

    // Schedules (4)
    { method: 'get', path: '/schedules', section: 'schedules-list' },
    { method: 'get', path: `/schedules/${sid}`, section: 'schedules-detail', id: sid },
    { method: 'post', path: '/schedules/create', section: 'schedules-create' },
    { method: 'post', path: '/schedules/toggle', section: 'schedules-toggle' },

    // Analytics (3)
    { method: 'get', path: '/analytics', section: 'analytics' },
    { method: 'get', path: '/analytics/usage', section: 'analytics-usage' },
    { method: 'get', path: '/analytics/performance', section: 'analytics-performance' },

    // Settings (2)
    { method: 'get', path: '/settings', section: 'settings-get' },
    { method: 'put', path: '/settings', section: 'settings-put' },

    // Utilities (4)
    { method: 'get', path: '/health', section: 'health' },
    { method: 'get', path: '/formats', section: 'formats' },
    { method: 'get', path: '/fields', section: 'fields' },
    { method: 'post', path: '/validate', section: 'validate' },
  ];
  return endpoints;
}

describe('createEbayRouter', () => {
  test('generates exactly 28 endpoints in the router', () => {
    const config: EbayRouteConfig = { theme: 'lime-600', resourceName: 'exports' };
    const router = createEbayRouter(config);
    const total = countRoutes(router);
    expect(total).toBe(28);
  });

  test('responds 200 for all endpoints with correct payload', async () => {
    const theme = 'lime-600';
    const resourceName = 'exports';
    const config: EbayRouteConfig = { theme, resourceName };
    const app = buildApp(config);

    const endpoints = expectedEndpoints(resourceName);
    expect(endpoints.length).toBe(28);

    for (const ep of endpoints) {
      const res = await request(app)[ep.method](ep.path).expect(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.path).toBe(ep.path);
      expect(res.body.method).toBe(ep.method.toUpperCase());
      expect(res.body.theme).toBe(theme);
      expect(res.body.section).toBe(ep.section);
      if (ep.id) {
        expect(res.body.id).toBe(ep.id);
      }
    }
  });

  test('applies resourceName from config', async () => {
    const theme = 'sky-500';
    const resourceName = 'listings';
    const config: EbayRouteConfig = { theme, resourceName, crudActions: { action: 'doit', detail: 'show' } };
    const app = buildApp(config);

    // list endpoint
    const resList = await request(app).get(`/${resourceName}`).expect(200);
    expect(resList.body.section).toBe(`${resourceName}-list`);

    // custom action/detail endpoints reflect config
    const id = '777';
    const resAction = await request(app).post(`/${resourceName}/${id}/doit`).expect(200);
    expect(resAction.body.section).toBe(`${resourceName}-doit`);
    expect(resAction.body.id).toBe(id);

    const resDetail = await request(app).get(`/${resourceName}/${id}/show`).expect(200);
    expect(resDetail.body.section).toBe(`${resourceName}-show`);
    expect(resDetail.body.id).toBe(id);
  });
});

