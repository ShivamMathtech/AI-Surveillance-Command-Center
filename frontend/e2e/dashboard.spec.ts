import {test,expect} from '@playwright/test';
test('demo starts, spatial views render, and controls work',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('heading',{name:'AI SURVEILLANCE COMMAND CENTER'})).toBeVisible();
 await expect(page.getByText('System online',{exact:true})).toBeVisible();
 await expect(page.locator('.feed canvas')).toHaveCount(4);
 await expect(page.locator('.detection-card').first()).toBeVisible();
 await page.locator('.detection-card').first().click();await expect(page.locator('.track-detail')).toBeVisible();
 await page.getByRole('button',{name:'Tracks',exact:true}).click();await expect(page.getByText('Track registry')).toBeVisible();
 await page.getByRole('button',{name:'Research',exact:true}).click();await expect(page.getByText('Research workspace')).toBeVisible();
 await page.getByRole('button',{name:'Save experiment snapshot'}).click();await expect(page.getByText('Experiment snapshot saved')).toBeVisible();
 await page.getByRole('button',{name:'Home',exact:true}).click();await page.screenshot({path:'../docs/dashboard.png',fullPage:true});
 expect(errors).toEqual([]);
});
