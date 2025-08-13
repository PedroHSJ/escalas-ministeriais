"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { NavigationLink } from "@/components/ui/navigation-link";
import { useNavigation } from "@/contexts/NavigationContext";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      isActive?: boolean;
      items?: {
        title: string;
        url: string;
        isActive?: boolean;
      }[];
    }[];
  }[];
}) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            {item.items && item.items.length > 0 ? (
              <Collapsible
                asChild
                defaultOpen={item.isActive}
                className="group/collapsible"
              >
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={item.isActive}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <Collapsible
                          key={subItem.title}
                          asChild
                          defaultOpen={subItem.isActive}
                          className="group/collapsible"
                        >
                          <SidebarMenuSubItem>
                            {subItem.items?.length ? (
                              <>
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuSubButton>
                                    <span>{subItem.title}</span>
                                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                  </SidebarMenuSubButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <SidebarMenuSub>
                                    {subItem.items.map((nestedItem) => (
                                      <SidebarMenuSubItem
                                        key={nestedItem.title}
                                      >
                                        <SidebarMenuSubButton
                                          asChild
                                          isActive={nestedItem.isActive}
                                        >
                                          <NavigationLink href={nestedItem.url} tabIndex={nestedItem.isActive ? -1 : 0} aria-disabled={nestedItem.isActive} style={nestedItem.isActive ? { pointerEvents: "none", opacity: 0.6 } : {}}>
                                            {nestedItem.title}
                                          </NavigationLink>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    ))}
                                  </SidebarMenuSub>
                                </CollapsibleContent>
                              </>
                            ) : (
                              <SidebarMenuSubButton
                                asChild
                                isActive={subItem.isActive}
                              >
                                <NavigationLink href={subItem.url} tabIndex={subItem.isActive ? -1 : 0} aria-disabled={subItem.isActive} style={subItem.isActive ? { pointerEvents: "none", opacity: 0.6 } : {}}>
                                  {subItem.title}
                                </NavigationLink>
                              </SidebarMenuSubButton>
                            )}
                          </SidebarMenuSubItem>
                        </Collapsible>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              </Collapsible>
            ) : (
              <SidebarMenuButton asChild isActive={item.isActive}>
                <NavigationLink href={item.url} tabIndex={item.isActive ? -1 : 0} aria-disabled={item.isActive} style={item.isActive ? { pointerEvents: "none", opacity: 0.6 } : {}}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </NavigationLink>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
