-- Second-pass mojibake fix: full CP775 round-trip on stragglers
BEGIN;
UPDATE places SET name='Стрп' WHERE id=1066;
UPDATE places SET name='Лапчићи' WHERE id=2005;
UPDATE places SET name='Тудоровићи' WHERE id=1996;
UPDATE places SET name='Подбабац' WHERE id=2002;
UPDATE places SET name='Калудерац' WHERE id=2004;
UPDATE place_images SET alt_text='Стрп' WHERE id=99;
UPDATE place_images SET alt_text='Лапчићи' WHERE id=347;
UPDATE place_images SET alt_text='Калудерац' WHERE id=348;
UPDATE place_images SET alt_text='Подбабац' WHERE id=350;
UPDATE place_images SET alt_text='Тудоровићи' WHERE id=356;
UPDATE places SET name = name;  -- re-fire FTS trigger
COMMIT;
