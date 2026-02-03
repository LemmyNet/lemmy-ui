import {
  communityRSSUrlLocal,
  localRSSUrl,
  multiCommunityRSSUrlLocal,
  profileRSSUrl,
} from "@utils/app";
import type { Request, Response } from "express";

export function FrontPageFeedHandler(_req: Request, res: Response) {
  res.redirect(localRSSUrl());
}

export function ProfileFeedHandler(req: Request, res: Response) {
  const name = req.params.name;
  res.redirect(profileRSSUrl(name));
}

export function CommunityFeedHandler(req: Request, res: Response) {
  const name = req.params.name;
  res.redirect(communityRSSUrlLocal(name));
}

export function MultiCommunityFeedHandler(req: Request, res: Response) {
  const name = req.params.name;
  res.redirect(multiCommunityRSSUrlLocal(name));
}
