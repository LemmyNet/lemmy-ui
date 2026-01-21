import {
  communityRSSUrlLocal,
  localRSSUrl,
  multiCommunityRSSUrlLocal,
  profileRSSUrl,
} from "@utils/app";
import type { Request, Response } from "express";

export async function FrontPageFeedHandler(_req: Request, res: Response) {
  res.redirect(localRSSUrl());
}

export async function ProfileFeedHandler(req: Request, res: Response) {
  const name = req.params.name;
  res.redirect(profileRSSUrl(name));
}

export async function CommunityFeedHandler(req: Request, res: Response) {
  const name = req.params.name;
  res.redirect(communityRSSUrlLocal(name));
}

export async function MultiCommunityFeedHandler(req: Request, res: Response) {
  const name = req.params.name;
  res.redirect(multiCommunityRSSUrlLocal(name));
}
