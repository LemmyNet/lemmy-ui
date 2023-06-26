import type { Response } from "express";

export default async ({ res }: { res: Response }) => {
  res.setHeader("content-type", "text/plain; charset=utf-8");

  res.send(`User-Agent: *
  Disallow: /login
  Disallow: /login_reset
  Disallow: /settings
  Disallow: /create_community
  Disallow: /create_post
  Disallow: /create_private_message
  Disallow: /inbox
  Disallow: /setup
  Disallow: /admin
  Disallow: /password_change
  Disallow: /search/
  `);
};
