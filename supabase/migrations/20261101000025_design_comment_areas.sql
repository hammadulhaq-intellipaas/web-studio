-- Review link: a comment can mark an area (a box the client draws around something) instead of
-- a single spot. x and y become the box's top-left corner (x as a percentage of the page width,
-- y in px); w is a percentage of the page width, h is in px. A comment without them is a spot,
-- as before. Until this runs, a drawn box is saved as a spot at its centre.
-- Safe to run more than once.

alter table design_comments add column if not exists w real;
alter table design_comments add column if not exists h real;
